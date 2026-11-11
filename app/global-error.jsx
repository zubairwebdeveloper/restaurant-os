"use client";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#151D18",
          color: "#F5F0E6",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 500 }}>Something went wrong</h1>
          <p style={{ opacity: 0.7 }}>Please reload the page.</p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              padding: "10px 24px",
              background: "#B9975B",
              color: "#151D18",
              border: 0,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
