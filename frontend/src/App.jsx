import { GoogleOAuthProvider } from "@react-oauth/google";
import Dashboard from "./pages/Dashboard";
import GoogleCallbackPage from "./pages/GoogleCallbackPage";
import { GOOGLE_CLIENT_ID } from "./config";

function App() {
  const pathname = window.location.pathname;
  const showCallback = pathname.startsWith("/google/callback");
  const content = showCallback ? <GoogleCallbackPage /> : <Dashboard />;

  if (!GOOGLE_CLIENT_ID) {
    if (import.meta.env.DEV) {
      console.warn(
        "VITE_GOOGLE_CLIENT_ID no está configurado. El flujo de OAuth utilizará únicamente el backend."
      );
    }
    return content;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {content}
    </GoogleOAuthProvider>
  );
}

export default App;
