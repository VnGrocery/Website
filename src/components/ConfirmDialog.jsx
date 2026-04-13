import { createContext, useContext, useMemo, useState } from "react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const value = useMemo(
    () => ({
      confirm(options) {
        return new Promise((resolve) => {
          setDialog({ ...options, resolve });
        });
      },
    }),
    [],
  );

  function close(answer) {
    if (!dialog) {
      return;
    }
    dialog.resolve(answer);
    setDialog(null);
  }

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog ? (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{dialog.title || "Xác nhận thao tác"}</h5>
                  <button type="button" className="close" onClick={() => close(false)}>
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <p className="mb-0">{dialog.message || "Bạn có chắc muốn tiếp tục không?"}</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => close(false)}>
                    Hủy
                  </button>
                  <button type="button" className={`btn btn-${dialog.confirmTone || "primary"}`} onClick={() => close(true)}>
                    {dialog.confirmLabel || "Xác nhận"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used inside ConfirmProvider");
  }
  return context.confirm;
}
