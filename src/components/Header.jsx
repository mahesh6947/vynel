export default function Header() {
  return (
    <div style={styles.header}>
      <div>
        <div style={styles.title}>Vynel</div>
        <div style={styles.caption}>
          Private Browser-Based AI !
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
    height: "64px",
    display: "flex",
    alignItems: "center",
    padding: "0 24px",
    background: "#000000",
    borderBottom: "1px solid #1f1f1f"
  },

  title: {
    fontSize: "23px",
    fontWeight: 300,
    color: "#ff6200",
    lineHeight: 1.2
  },

  caption: {
    fontSize: "16px",
    fontStyle: "italic",
    fontWeight: 300,
    color: "#9ca3af",
    lineHeight: 1.2
  }
};
