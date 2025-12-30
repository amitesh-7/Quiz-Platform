import { useCallback, useMemo, useEffect, useState } from "react";
import Particles from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

const ParticleBackground = () => {
  const [isDark, setIsDark] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem("theme");
      setIsDark(savedTheme !== "light");
    };

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkTheme();
    checkMobile();

    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Listen for resize
    window.addEventListener("resize", checkMobile);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const options = useMemo(
    () => ({
      background: {
        color: {
          value: "transparent",
        },
      },
      fpsLimit: 60,
      interactivity: {
        events: {
          onClick: {
            enable: true,
            mode: "push",
          },
          onHover: {
            enable: true,
            mode: "repulse",
          },
        },
        modes: {
          push: {
            quantity: 2,
          },
          repulse: {
            distance: 100,
            duration: 0.4,
          },
        },
      },
      particles: {
        color: {
          value: isDark ? "#ffffff" : "#1e293b",
        },
        links: {
          color: isDark ? "#ffffff" : "#1e293b",
          distance: 150,
          enable: true,
          opacity: isDark ? 0.2 : 0.3,
          width: 1,
        },
        move: {
          direction: "none",
          enable: true,
          outModes: {
            default: "bounce",
          },
          random: false,
          speed: 1,
          straight: false,
        },
        number: {
          density: {
            enable: true,
            area: 800,
          },
          value: isMobile ? 30 : 60, // Reduce particles on mobile
        },
        opacity: {
          value: isDark ? 0.3 : 0.5,
        },
        shape: {
          type: "circle",
        },
        size: {
          value: { min: 1, max: isMobile ? 2 : 3 }, // Smaller particles on mobile
        },
      },
      detectRetina: true,
    }),
    [isDark, isMobile]
  );

  return (
    <div className="particles-container">
      <Particles id="tsparticles" init={particlesInit} options={options} />
    </div>
  );
};

export default ParticleBackground;
