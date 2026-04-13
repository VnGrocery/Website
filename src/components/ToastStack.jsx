import { createContext, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  function pushToast({ tone = "secondary", text }) {
    const id = `${Date.now()}-${Math.random()}`;
    setItems((current) => [...current, { id, tone, text }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 4000);
  }

  const value = useMemo(
    () => ({
      push: pushToast,
      success(text) {
        pushToast({ tone: "success", text });
      },
      error(text) {
        pushToast({ tone: "danger", text });
      },
      info(text) {
        pushToast({ tone: "info", text });
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack-react">
        {items.map((item) => (
          <div key={item.id} className={`alert alert-${item.tone} shadow-sm mb-2`}>
            {item.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
