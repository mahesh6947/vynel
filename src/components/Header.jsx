import { useEffect, useRef } from "react";

export default function Header() {
  const headerRef = useRef(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(-8px)";

    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  }, []);

  return (
    <>
      <style>{`
        @keyframes subtleGlow {
          0% { box-shadow: 0 0 0 rgba(255,98,0,0.0); }
          50% { box-shadow: 0 0 18px rgba(255,98,0,0.08); }
          100% { box-shadow: 0 0 0 rgba(255,98,0,0.0); }
        }
      `}</style>

      <div ref={headerRef} style={styles.header}>
        <div style={styles.left}>
          <div style={styles.title}>Vynel</div>
          <div style={styles.caption}>
            Private · Browser-Native · WebGPU
          </div>
        </div>

        <div style={styles.right}>
    <div style={styles.caption}>
      Currently runs on Windows systems with Dedicated GPU only
    </div>
  </div>


        
      </div>
    </>
  );
}

/* ========================= STYLES ========================= */

const styles = {
  header: {
    height: "65px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 28px",
    background: "rgba(15,15,20,0.75)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    transition: "all 0.25s ease",
    animation: "subtleGlow 6s ease-in-out infinite"
  },

  left: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  title: {
    fontSize: "24px",
    fontWeight: 400,
    color: "#ff6200",
    letterSpacing: "0.5px",
    lineHeight: 1.2,
    transition: "all 0.2s ease"
  },

  caption: {
    fontSize: "14px",
    fontWeight: 300,
    color: "#9ca3af",
    marginTop: "4px",
    letterSpacing: "0.5px",
    transition: "all 0.2s ease"
  },

  right: {
    display: "flex",
    alignItems: "center",
  },

  engineBadge: {
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 500,
    borderRadius: "999px",
    background: "rgba(255,98,0,0.08)",
    border: "1px solid rgba(255,98,0,0.25)",
    color: "#ff6200",
    transition: "all 0.2s ease",
    cursor: "default"
  }
};
