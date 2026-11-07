// Los despliegues de vista previa se compilan con VITE_READ_ONLY=true: nadie puede crear huéspedes,
// reservas ni pagos desde su interfaz, aunque estén apuntando a la base real. En producción la variable
// no existe. Toda función que escribe (o inicia un cobro) llama a assertWritable() ANTES de su primera petición.
export function assertWritable() {
    if (import.meta.env?.VITE_READ_ONLY === 'true') {
        throw new Error('Esta es una vista previa de solo lectura: no se pueden crear reservas ni pagos.')
    }
}
