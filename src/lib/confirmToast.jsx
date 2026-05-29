import toast from 'react-hot-toast'

/**
 * Confirmación basada en promesa usando un toast custom de react-hot-toast.
 * Resuelve true si el usuario confirma, false si cancela.
 * Reemplaza a window.confirm() con un diálogo estilizado y no bloqueante.
 */
export function confirmToast(message, { confirmLabel = 'Confirmar', cancelLabel = 'Cancelar' } = {}) {
    return new Promise((resolve) => {
        toast(
            (t) => (
                <div className="flex flex-col gap-3">
                    <p className="text-sm text-slate-100">{message}</p>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => { toast.dismiss(t.id); resolve(false) }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={() => { toast.dismiss(t.id); resolve(true) }}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            ),
            { duration: Infinity }
        )
    })
}
