import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Palette, Eraser, Clock } from "lucide-react";
import { CanvasDelta } from "@/utils/surf";
import { getCanvas } from "@/view-functions/gameView";
import { aptos } from "@/utils/aptos";
import { AccountAddress } from "@aptos-labs/ts-sdk";

interface GameCanvasProps {
  gameAddress: string;
  width: number;
  height: number;
  canDraw: boolean;
  userTeam: number | null;
  currentRound: number;
  gameStarted: boolean;
  roundFinished: boolean;
  onCanvasUpdate?: (deltas: CanvasDelta[]) => Promise<void>;
}

const COLORS = [
  { name: "Black", value: 0, hex: "#000000" },
  { name: "White", value: 1, hex: "#FFFFFF" },
  { name: "Red", value: 2, hex: "#FF0000" },
  { name: "Green", value: 3, hex: "#00FF00" },
  { name: "Blue", value: 4, hex: "#0000FF" },
  { name: "Yellow", value: 5, hex: "#FFFF00" },
  { name: "Orange", value: 6, hex: "#FFA500" },
  { name: "Purple", value: 7, hex: "#800080" },
  { name: "Pink", value: 8, hex: "#FFC0CB" },
  { name: "Brown", value: 9, hex: "#A52A2A" },
  { name: "Gray", value: 10, hex: "#808080" },
];

export function GameCanvas({
  gameAddress,
  width,
  height,
  canDraw,
  userTeam,
  currentRound,
  gameStarted,
  roundFinished,
  onCanvasUpdate,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState(0); // Black by default
  const [brushSize, setBrushSize] = useState(5);
  const [pendingDeltas, setPendingDeltas] = useState<CanvasDelta[]>([]);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const autoFlushIntervalRef = useRef<NodeJS.Timeout | null>(null);



  // Load canvas data from blockchain
  const loadCanvasData = useCallback(async () => {
    // Early return conditions
    if (userTeam === null || !gameStarted || currentRound <= 0) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Convert currentRound (1-based) to array index (0-based) for the contract
    const roundIndex = Math.max(0, currentRound - 1);

    try {
      
      const canvasData = await getCanvas(
        aptos,
        AccountAddress.fromString(gameAddress),
        roundIndex,
        userTeam
      );

      // Clear canvas with white background first
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      // Draw existing pixels
      Object.entries(canvasData).forEach(([position, colorValue]) => {
        const pos = parseInt(position);
        
        // Convert from scaled coordinate system back to canvas coordinates
        // The position was stored as: scaledY * 256 + scaledX where scaled coords are 0-255
        const scaledX = pos % 256;
        const scaledY = Math.floor(pos / 256);
        
        // Convert back to actual canvas coordinates
        const x = Math.floor((scaledX / 255) * width);
        const y = Math.floor((scaledY / 255) * height);
        

        
        const color = COLORS.find(c => c.value === colorValue);
        
        if (color && x >= 0 && x < width && y >= 0 && y < height) {
          ctx.fillStyle = color.hex;
          // Draw with the same brush size as used during drawing
          ctx.beginPath();
          ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

    } catch (error) {
      console.error("Failed to load canvas data:", error);
      
      // Check if this is a round not found error (common during round transitions)
      const isRoundNotFoundError = error instanceof Error && 
        error.message.includes("EROUND_NOT_FOUND");
      
      if (!isRoundNotFoundError) {
        console.error("Unexpected error loading canvas:", error);
      }
      
      // Continue without loading - don't break the app
      // Clear the canvas if we can't load data
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
    }
  }, [width, height, gameAddress, gameStarted, userTeam, currentRound, canDraw, brushSize]);

  // Initialize canvas and load existing data
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas with white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // Load initial canvas data
    loadCanvasData();
  }, [width, height, gameAddress, gameStarted, userTeam, currentRound, loadCanvasData]);

  // Periodic canvas reloading for real-time updates (only for guessers, not artists)
  useEffect(() => {
    // Only refresh periodically for guessers, not for artists who are actively drawing
    // Also stop refreshing if the round is finished
    if (!gameStarted || userTeam === null || canDraw || roundFinished) return;

    // Set up interval to reload canvas data every 2 seconds to show artist's progress
    const reloadInterval = setInterval(() => {
      loadCanvasData();
    }, 2000);

    return () => {
      clearInterval(reloadInterval);
    };
  }, [gameStarted, userTeam, canDraw, roundFinished, loadCanvasData]);

  // Convert mouse position to canvas position
  const getCanvasPosition = useCallback(
    (e: MouseEvent | React.MouseEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // Convert 2D position to 1D array position
  // Use smaller coordinate system to fit in u16 (0-65535)
  const positionToIndex = (x: number, y: number): number => {
    // Scale down coordinates to fit in u16 range
    const scaledX = Math.floor((x / width) * 255);  // Scale to 0-255
    const scaledY = Math.floor((y / height) * 255); // Scale to 0-255
    return scaledY * 256 + scaledX; // Max value: 255 * 256 + 255 = 65535
  };

  // Draw on canvas and create delta
  const drawPixel = useCallback(
    (x: number, y: number, colorIndex: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const color = COLORS[colorIndex] || COLORS[0];
      ctx.fillStyle = color.hex;

      // Draw a circle for smoother lines
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
      ctx.fill();

      // Add to pending deltas
      const position = positionToIndex(x, y);
      const newDelta = { position, color: colorIndex };
      

      
      setPendingDeltas(prev => [...prev, newDelta]);
    },
    [brushSize, width, height]
  );

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent) => {

    if (!canDraw) return;

    setIsDrawing(true);
    const { x, y } = getCanvasPosition(e);

    drawPixel(x, y, selectedColor);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !canDraw) return;

    const { x, y } = getCanvasPosition(e);
    drawPixel(x, y, selectedColor);
  };

  const handleMouseUp = () => {

    setIsDrawing(false);
    // Don't auto-flush on mouse up anymore
  };

  // Flush pending deltas to blockchain
  const flushDeltas = useCallback(async () => {
    if (pendingDeltas.length === 0) return;

    setIsLoading(true);
    try {

      
      if (onCanvasUpdate) {
        await onCanvasUpdate(pendingDeltas);

        
        // Clear pending deltas after successful submission
        setPendingDeltas([]);
        setCountdown(0);

        // Clear the auto-flush interval
        if (autoFlushIntervalRef.current) {
          clearInterval(autoFlushIntervalRef.current);
          autoFlushIntervalRef.current = null;
        }
      } else {
        console.warn("onCanvasUpdate callback not provided");
      }
    } catch (error) {
      console.error("Failed to flush deltas:", error);
      // Don't clear deltas on failure - keep them for retry
      // Reset countdown to try again
      setCountdown(5);
    } finally {
      setIsLoading(false);
    }
  }, [pendingDeltas, onCanvasUpdate]);

  // Auto-flush effect - start countdown when first delta is added
  useEffect(() => {


    // Start countdown only when first delta is added and no interval is running
    // Also don't start if the round is finished
    if (pendingDeltas.length === 1 && !autoFlushIntervalRef.current && canDraw && !roundFinished) {

      setCountdown(5); // Start 5-second countdown
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // Auto-flush when countdown reaches 0
            flushDeltas();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      autoFlushIntervalRef.current = interval;
    }

    return () => {
      if (autoFlushIntervalRef.current) {
        clearInterval(autoFlushIntervalRef.current);
        autoFlushIntervalRef.current = null;
      }
    };
  }, [pendingDeltas.length, canDraw, roundFinished, flushDeltas]);

  // Separate effect to cleanup when no deltas, can't draw, or round is finished
  useEffect(() => {
    if (pendingDeltas.length === 0 || !canDraw || roundFinished) {
      if (autoFlushIntervalRef.current) {
        clearInterval(autoFlushIntervalRef.current);
        autoFlushIntervalRef.current = null;
      }
      setCountdown(0);
    }
  }, [pendingDeltas.length, canDraw, roundFinished]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    setPendingDeltas([]);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Canvas */}
      <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className={`block ${canDraw ? "cursor-crosshair" : "cursor-default"}`}
          style={{ maxWidth: "100%", maxHeight: "60vh", pointerEvents: canDraw ? "auto" : "none" }}
          onMouseDown={canDraw ? handleMouseDown : undefined}
          onMouseMove={canDraw ? handleMouseMove : undefined}
          onMouseUp={canDraw ? handleMouseUp : undefined}
          onMouseLeave={canDraw ? () => setIsDrawing(false) : undefined}
        />
        
        {!canDraw && userTeam !== null && (
          <div className="absolute top-2 left-2 bg-blue-100 border border-blue-300 px-3 py-1 rounded-md shadow-sm">
            <p className="text-xs font-medium text-blue-800">
              👀 Watching your team's artist draw
            </p>
          </div>
        )}
        
        {!canDraw && userTeam === null && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white px-4 py-2 rounded-md shadow-md">
              <p className="text-sm font-medium">
                You're not playing in this game
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Drawing Tools */}
      {canDraw && (
        <div className="flex items-center space-x-4">
          {/* Manual Flush Button */}
          {pendingDeltas.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={flushDeltas}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <span>Submit Changes ({pendingDeltas.length})</span>
              {countdown > 0 && (
                <span className="text-xs bg-white text-black px-1 rounded">
                  {countdown}s
                </span>
              )}
            </Button>
          )}

          {/* Color Palette */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColorPalette(!showColorPalette)}
              className="flex items-center gap-2"
            >
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: COLORS[selectedColor].hex }}
              />
              <Palette size={16} />
            </Button>
            
            {showColorPalette && (
              <div className="absolute top-full mt-2 bg-white border rounded-lg shadow-lg p-3 grid grid-cols-7 gap-2 z-10">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    className={`w-8 h-8 rounded border-2 ${
                      selectedColor === color.value
                        ? "border-blue-500"
                        : "border-gray-200"
                    }`}
                    style={{ backgroundColor: color.hex }}
                    onClick={() => {
                      setSelectedColor(color.value);
                      setShowColorPalette(false);
                    }}
                    title={color.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Brush Size */}
          <div className="flex items-center gap-2">
            <label className="text-sm">Size:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-sm w-6">{brushSize}</span>
          </div>

          {/* Auto-flush Countdown */}
          {pendingDeltas.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded text-sm">
              <Clock size={16} className="text-blue-600" />
              <span className="text-blue-700">
                Auto-submit in {countdown}s ({pendingDeltas.length} changes)
              </span>
            </div>
          )}

          {/* Clear Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            className="flex items-center gap-2"
          >
            <Eraser size={16} />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}