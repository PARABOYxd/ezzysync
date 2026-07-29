export function connectGoogle() {
    const token = localStorage.getItem("hf_token");

    window.location.href =
        `${import.meta.env.VITE_API_URL}/google/auth?token=${token}`;
}