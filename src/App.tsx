import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

// Placeholder até as páginas reais serem implementadas (M7/M8)
function PlaceholderPage({ title }: { title: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Typography variant="h4" color="text.secondary">{title}</Typography>
    </Box>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/acesso" element={<PlaceholderPage title="Acesso do Convidado" />} />
      <Route path="/admin" element={<PlaceholderPage title="Admin" />} />
      <Route path="*" element={<Navigate to="/acesso" replace />} />
    </Routes>
  );
}
