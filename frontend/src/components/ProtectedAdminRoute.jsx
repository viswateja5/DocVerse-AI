import React, { useEffect } from 'react';
import { useToast } from './ui/Toast';

export default function ProtectedAdminRoute({ userRole, children, onNavigateBack }) {
  const { addToast } = useToast();

  useEffect(() => {
    if (userRole !== 'admin') {
      addToast("Unauthorized Access", "error");
      onNavigateBack();
    }
  }, [userRole, addToast, onNavigateBack]);

  if (userRole === 'admin') {
    return children;
  }

  return null;
}
