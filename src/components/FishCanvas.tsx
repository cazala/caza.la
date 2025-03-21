import { useEffect, useRef, useState } from 'react';
import { Simulation, SimulationOptions } from '../lib/Simulation';
import { logger } from '../lib/logging';
import { SIMULATION } from '../lib/constants';

const FishCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Store simulation instance in a ref
  const simulationRef = useRef<Simulation | null>(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  // Track DPR changes
  const [dpr, setDpr] = useState(window.devicePixelRatio || 1);

  // Handle window resize and display changes
  useEffect(() => {
    // Function to get safe viewport dimensions
    const getSafeViewportDimensions = () => {
      // For mobile Safari, we need to be extra careful about the height
      // innerHeight is more reliable than screen.height for visible area
      const safeWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
      const safeHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);

      logger.debug(`Safe viewport dimensions: ${safeWidth}x${safeHeight}`);
      return { width: safeWidth, height: safeHeight };
    };

    const handleResize = () => {
      // Get safe dimensions that account for browser UI
      const safeDimensions = getSafeViewportDimensions();
      setDimensions(safeDimensions);

      // Check if DPR has changed
      const currentDpr = window.devicePixelRatio || 1;
      if (currentDpr !== dpr) {
        setDpr(currentDpr);
      }
    };

    // Handle display changes that might affect DPR
    const handleDisplayChange = () => {
      logger.info('Display properties changed, updating canvas');
      const currentDpr = window.devicePixelRatio || 1;
      if (currentDpr !== dpr) {
        setDpr(currentDpr);
      }
      if (simulationRef.current) {
        simulationRef.current.handleDisplayChange();
      }
    };

    // Initial resize to ensure correct size
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Listen for display changes, zoom level changes, etc.
    const mediaQueryList = window.matchMedia('(resolution: 1dppx)');
    mediaQueryList.addEventListener('change', handleDisplayChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      try {
        mediaQueryList.removeEventListener('change', handleDisplayChange);
      } catch (e) {
        logger.warn('Could not remove display change listener', e);
      }
    };
  }, [dpr]);

  // Initialize simulation
  useEffect(() => {
    if (canvasRef.current) {
      logger.info('Canvas element found, initializing simulation');

      // Make sure canvas is properly sized before initializing simulation
      const canvas = canvasRef.current;
      const currentDpr = window.devicePixelRatio || 1;

      // Set the canvas dimensions accounting for DPR
      canvas.width = dimensions.width * currentDpr;
      canvas.height = dimensions.height * currentDpr;

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
          // Account for DPR in fish count calculation
          numFish: (() => {
            // Base it on the actual canvas dimensions (which include DPR scaling)
            const baseCount = (canvas.width / 600) * 50;
            // Ensure we have a reasonable minimum and maximum
            return Math.min(Math.max(baseCount, SIMULATION.MIN_FISH), SIMULATION.MAX_FISH);
          })(),
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
  }, [dimensions, dpr]);

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

  // Prevent scrolling on iOS
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      e.preventDefault();
    };

    // Add event listeners to prevent scrolling
    document.body.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      document.body.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width * dpr}
      height={dimensions.height * dpr}
      tabIndex={0} // Make canvas focusable
      style={{
        position: 'fixed', // Changed from absolute to fixed to avoid scroll issues
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh', // Using vh instead of % to match viewport exactly
        maxHeight: '100vh', // Ensure it never exceeds viewport height
        zIndex: 0,
        display: 'block',
        outline: 'none',
        background: 'transparent',
        pointerEvents: 'auto',
        overflow: 'hidden', // Ensure no overflow
      }}
    />
  );
};

export default FishCanvas;
