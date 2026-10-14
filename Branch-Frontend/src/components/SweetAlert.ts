import Swal from "sweetalert2";

export const showSuccess = (title: string, text: string) =>
    Swal.fire({ icon: "success", title, text, position: "center", confirmButtonColor: "#0f172a" });

export const showError = (title: string, text: string) =>
    Swal.fire({ icon: "error", title, text, position: "center", confirmButtonColor: "#0f172a" });

export const showWarning = (title: string, text: string) =>
    Swal.fire({ icon: "warning", title, text, position: "center", confirmButtonColor: "#0f172a" });

export const showConfirm = (title: string, text: string) =>
    Swal.fire({
        icon: "warning",
        title,
        text,
        position: "center",
        showCancelButton: true,
        confirmButtonText: "Yes, continue",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#0f172a",
        cancelButtonColor: "#64748b"
    }).then(result => result.isConfirmed);