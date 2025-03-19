import { useEffect, useRef, useState } from "react";
import { Simulation } from "../lib/Simulation";

// Create a global reference to the simulation to ensure we only have one instance
let globalSimulation: Simulation | null = null;

const FishCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize simulation
  useEffect(() => {
    if (canvasRef.current) {
      console.log("Canvas element found, initializing simulation");

      // Make sure canvas is properly sized before initializing simulation
      const canvas = canvasRef.current;
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      try {
        // Only initialize if not already initialized globally
        if (!globalSimulation) {
          console.log("Creating new global simulation instance");
          globalSimulation = new Simulation(canvas);
          console.log("Simulation initialized successfully");
        } else {
          console.log("Using existing global simulation instance");
        }
      } catch (error) {
        console.error("Error initializing simulation:", error);
      }
    } else {
      console.error("Canvas element not found");
    }

    return () => {
      // We don't clean up the global simulation on component unmount
      // as it should persist across hot reloads
    };
  }, [dimensions]);

  // Add keyboard focus handling
  useEffect(() => {
    // Function to ensure the canvas has focus
    const ensureFocus = () => {
      if (canvasRef.current) {
        canvasRef.current.focus();
      }
    };

    // Set initial focus
    ensureFocus();

    // Add click handler to ensure focus when clicking on the canvas
    const handleClick = () => {
      ensureFocus();
    };

    // Add event listeners
    document.addEventListener("click", handleClick);

    // Log to verify this effect is running
    console.log("Setting up keyboard focus handling");

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      tabIndex={0} // Make canvas focusable
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        display: "block", // Ensure it's displayed as block
        outline: "none", // Remove focus outline
      }}
    />
  );
};

export default FishCanvas;
