import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Palette, Eraser, Send } from "lucide-react";
import { CanvasDelta } from "@/utils/surf";

interface GameCanvasProps {
  gameAddress: string;
  width: number;
  height: number;
  canDraw: boolean;
  userTeam: number | null;
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
  { name: "Light Blue", value: 11, hex: "#ADD8E6" },
  { name: "Light Green", value: 12, hex: "#90EE90" },
  { name: "Light Red", value: 13, hex: "#FFB6C1" },
];

export function GameCanvas({
  gameAddress,
  width,
  height,
  canDraw,
  userTeam,
  onCanvasUpdate,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState(0); // Black by default
  const [brushSize, setBrushSize] = useState(5);
  const [pendingDeltas, setPendingDeltas] = useState<CanvasDelta[]>([]);
  const [showColorPalette, setShowColorPalette] = useState(false);

  // Initialize canvas
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

    // TODO: Load existing canvas data from blockchain
  }, [width, height, gameAddress]);

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
      setPendingDeltas(prev => [
        ...prev,
        { position, color: colorIndex }
      ]);
    },
    [brushSize, width]
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

    try {
      console.log("Flushing deltas to blockchain:", pendingDeltas);
      
      if (onCanvasUpdate) {
        await onCanvasUpdate(pendingDeltas);
      }
      
      // Clear pending deltas after successful submission
      setPendingDeltas([]);
    } catch (error) {
      console.error("Failed to flush deltas:", error);
    }
  }, [pendingDeltas, onCanvasUpdate]);

  // Remove auto-flush - will be manual now

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
          className={`block ${canDraw ? "cursor-crosshair" : "cursor-not-allowed"}`}
          style={{ maxWidth: "100%", maxHeight: "60vh" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDrawing(false)}
        />
        
        {!canDraw && (
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
            <div className="bg-white px-4 py-2 rounded-md shadow-md">
              <p className="text-sm font-medium">
                {userTeam === null
                  ? "You're not playing in this game"
                  : "Wait for your turn to draw"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Drawing Tools */}
      {canDraw && (
        <div className="flex items-center space-x-4">
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

          {/* Flush Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={flushDeltas}
            disabled={pendingDeltas.length === 0}
            className="flex items-center gap-2"
          >
            <Send size={16} />
            Submit ({pendingDeltas.length})
          </Button>

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