import { HashRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Help from "./pages/Help";
import Home from "./pages/Home";
import Stats from "./pages/Stats";

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}
