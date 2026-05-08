import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Instructions from "./pages/Instructions.tsx";
import Recording from "./pages/Recording.tsx";
import Analyzing from "./pages/Analyzing.tsx";
import Result from "./pages/Result.tsx";
import Sounds from "./pages/Sounds.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/instructions" element={<Instructions />} />
          <Route path="/recording/:step" element={<Recording />} />
          <Route path="/analyzing" element={<Analyzing />} />
          <Route path="/result/:type" element={<Result />} />
          <Route path="/sounds" element={<Sounds />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
