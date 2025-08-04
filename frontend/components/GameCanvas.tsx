import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Palette, /* Eraser, */ Clock } from "lucide-react";
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

const AUTO_SAVE_INTERVAL_SECS = 3;

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
  const [countdown, setCountdown] = useState(AUTO_SAVE_INTERVAL_SECS); // Countdown to next submission
  const [isSubmitting, setIsSubmitting] = useState(false); // Track submission state
  
  const autoSubmitIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSubmittedIndexRef = useRef<number>(0); // Track how many deltas we've submitted
  const pendingDeltasRef = useRef<CanvasDelta[]>([]); // Ref to access current deltas in interval



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
  };



  // Simple 5-second interval for submitting deltas with countdown
  useEffect(() => {
    console.log(`Canvas auto-submit effect: canDraw=${canDraw}, roundFinished=${roundFinished}`);
    if (canDraw && !roundFinished) {
      // Reset countdown and start intervals
      setCountdown(AUTO_SAVE_INTERVAL_SECS);
      
      // Start countdown interval (1 second)
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return AUTO_SAVE_INTERVAL_SECS; // Reset to 5 when it reaches 0
          }
          return prev - 1;
        });
      }, 1000);

      // Start auto-submit interval (AUTO_SAVE_INTERVAL_SECS seconds)
      console.log('Starting auto-submit interval for canvas');
      autoSubmitIntervalRef.current = setInterval(async () => {
        const currentDeltas = [...pendingDeltasRef.current]; // Use ref to get current state
        const newDeltasCount = currentDeltas.length - lastSubmittedIndexRef.current;
        
        console.log(`Auto-submit check: ${currentDeltas.length} total deltas, ${lastSubmittedIndexRef.current} already submitted, ${newDeltasCount} new`);
        
        if (newDeltasCount <= 0) return;

        // Get only the new deltas since last submission
        const newDeltas = currentDeltas.slice(lastSubmittedIndexRef.current);

        try {
          setIsSubmitting(true);
          if (onCanvasUpdate) {
            await onCanvasUpdate(newDeltas);
            // Update the index of successfully submitted deltas
            lastSubmittedIndexRef.current = currentDeltas.length;
            console.log(`Submitted ${newDeltas.length} new canvas deltas`);
          } else {
            console.warn("onCanvasUpdate callback not provided");
          }
        } catch (error) {
          console.error("Failed to submit new deltas:", error);
          // Don't update lastSubmittedIndexRef on failure - will retry next interval
        } finally {
          setIsSubmitting(false);
        }
      }, AUTO_SAVE_INTERVAL_SECS * 1000);
    } else {
      // Clear intervals when can't draw or round is finished
      if (autoSubmitIntervalRef.current) {
        console.log('Clearing auto-submit interval for canvas');
        clearInterval(autoSubmitIntervalRef.current);
        autoSubmitIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setCountdown(AUTO_SAVE_INTERVAL_SECS);
      setIsSubmitting(false);
    }

    // Cleanup on effect re-run or unmount
    return () => {
      if (autoSubmitIntervalRef.current) {
        clearInterval(autoSubmitIntervalRef.current);
        autoSubmitIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [canDraw, roundFinished]);

  // Keep ref in sync with state and reset submission tracking when deltas are cleared
  useEffect(() => {
    pendingDeltasRef.current = pendingDeltas;
    if (pendingDeltas.length === 0) {
      lastSubmittedIndexRef.current = 0;
    }
  }, [pendingDeltas]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    setPendingDeltas([]);
    lastSubmittedIndexRef.current = 0;
  };

  // Calculate pending changes count for display
  const pendingChangesCount = Math.max(0, pendingDeltas.length - lastSubmittedIndexRef.current);

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Easel Canvas */}
      <div className="easel-frame relative overflow-hidden bg-white paint-splatter">
        <canvas
          ref={canvasRef}
          className={`block ${canDraw ? "cursor-crosshair" : "cursor-default"}`}
          style={{ maxWidth: "100%", maxHeight: "60vh", pointerEvents: canDraw ? "auto" : "none" }}
          onMouseDown={canDraw ? handleMouseDown : undefined}
          onMouseMove={canDraw ? handleMouseMove : undefined}
          onMouseUp={canDraw ? handleMouseUp : undefined}
          onMouseLeave={canDraw ? () => setIsDrawing(false) : undefined}
        />
        
        {!canDraw && userTeam !== null && gameStarted && !roundFinished && (
          <div className="absolute top-4 left-4 artist-card px-4 py-2 paint-splatter">
            <p className="text-sm font-bold text-studio-blue flex items-center gap-2">
              <span>Watching your team's artist create magic!</span> ✨
            </p>
          </div>
        )}
        
        {!canDraw && userTeam === null && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <div className="artist-card px-6 py-4 text-center bounce-in">
              <div className="w-12 h-12 bg-studio-purple rounded-full paint-blob flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">👻</span>
              </div>
              <p className="font-bold text-studio-purple">
                You're a spectator in this art show! 🎭
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Artist Tools */}
      {canDraw && (
        <div className="flex items-center space-x-6">

          {/* Magic Color Palette */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowColorPalette(!showColorPalette)}
              className="bg-white hover:bg-gray-50 text-gray-800 hover:text-gray-900 font-semibold px-6 py-3 flex items-center gap-3 border-2 border-gray-300 shadow-lg rounded-2xl transition-all duration-300"
            >
              <div
                className="w-6 h-6 rounded-full border-2 border-white shadow-lg paint-blob"
                style={{ backgroundColor: COLORS[selectedColor].hex }}
              />
              <Palette size={20} className="text-studio-purple" />
              <span className="font-bold">Colors ✨</span>
            </Button>
            
            {showColorPalette && (
              <div className="absolute bottom-full mb-3 artist-card p-4 fun-shadow z-20 bounce-in">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-studio-blue rounded-full paint-blob flex items-center justify-center">
                    <Palette size={16} className="text-white" />
                  </div>
                  <h3 className="font-playful text-lg text-studio-blue">Artist's Palette 🎨</h3>
                </div>
                <div className="grid grid-cols-6 gap-3">
                  {COLORS.map((color, index) => (
                    <button
                      key={color.value}
                      className={`w-12 h-12 paint-blob transition-all duration-200 hover:scale-110 shadow-lg ${
                        selectedColor === color.value
                          ? "ring-4 ring-studio-blue ring-opacity-50 scale-110"
                          : "hover:shadow-xl"
                      }`}
                      style={{ 
                        backgroundColor: color.hex,
                        '--blob-rotation': `${index * 30}deg`
                      } as React.CSSProperties}
                      onClick={() => {
                        setSelectedColor(color.value);
                        setShowColorPalette(false);
                      }}
                      title={`${color.name} Paint 🎨`}
                    />
                  ))}
                </div>
                <div className="mt-3 text-center">
                  <p className="text-sm text-gray-600 font-medium">
                    Choose your paint! 🌈
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Brush Size - Hidden for now */}
          {false && (
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
          )}

          {/* Magic Auto-save Status */}
          <div className="artist-card px-4 py-2 paint-splatter">
            {isSubmitting ? (
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-studio-green rounded-full paint-blob flex items-center justify-center animate-spin">
                  <span className="text-white text-xs">✨</span>
                </div>
                <span className="font-bold text-studio-green">Saving masterpiece... 🎨</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-studio-blue rounded-full paint-blob flex items-center justify-center">
                  <Clock size={14} className="text-white" />
                </div>
                <span className="text-studio-blue">
                  Save in {countdown}s ✨ ({pendingChangesCount} brushstrokes)
                </span>
              </div>
            )}
          </div>

          {/* Clear Button - Hidden for now */}
          {/* <Button
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            className="flex items-center gap-2"
          >
            <Eraser size={16} />
            Clear
          </Button> */}
        </div>
      )}
    </div>
  );
}
