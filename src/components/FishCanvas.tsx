import { useEffect, useRef, useState } from 'react';
import { Simulation, SimulationOptions } from '../lib/Simulation';
import { logger } from '../lib/logging';

const FishCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Store simulation instance in a ref
  const simulationRef = useRef<Simulation | null>(null);
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

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize simulation
  useEffect(() => {
    if (canvasRef.current) {
      logger.info('Canvas element found, initializing simulation');

      // Make sure canvas is properly sized before initializing simulation
      const canvas = canvasRef.current;
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      // Also update the style directly to ensure visibility
      canvas.style.width = `${dimensions.width}px`;
      canvas.style.height = `${dimensions.height}px`;

      try {
        // Clean up existing simulation if it exists
        if (simulationRef.current) {
          logger.info('Cleaning up existing simulation instance');
          simulationRef.current.cleanup();
          simulationRef.current = null;
        }

        // Create a new simulation instance
        const simulationOptions: SimulationOptions = {
          canvasElement: canvas,
          numFish: Math.min((window.innerWidth / 600) * 50, 50),
        };

        logger.info('Creating new simulation instance');
        simulationRef.current = new Simulation(simulationOptions);
        logger.info('Simulation initialized successfully');
      } catch (error) {
        logger.error('Error initializing simulation:', error);
      }
    } else {
      logger.error('Canvas element not found');
    }

    return () => {
      // Clean up the simulation when component unmounts
      if (simulationRef.current) {
        logger.info('Cleaning up simulation on component unmount');
        simulationRef.current.cleanup();
        simulationRef.current = null;
      }
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
    document.addEventListener('click', handleClick);

    // Log to verify this effect is running
    logger.info('Setting up keyboard focus handling');

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      tabIndex={0} // Make canvas focusable
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0, // Change from -1 to 0 to ensure it's not hidden
        display: 'block', // Ensure it's displayed as block
        outline: 'none', // Remove focus outline
        background: 'transparent', // Ensure background is transparent
        pointerEvents: 'auto', // Make sure it receives mouse events
      }}
    />
  );
};

export default FishCanvas;
