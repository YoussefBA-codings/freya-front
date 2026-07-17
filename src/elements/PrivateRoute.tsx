import React, { ReactNode } from 'react';

// La vraie barrière est désormais le réseau : nginx (auth_request contre la
// session du portail Freya) ne sert cette app QUE si l'utilisateur est déjà
// authentifié — voir docs/ARCHITECTURE.md de freyaOMS. Ce composant ne fait
// donc plus de vérification côté client (l'ancien flag localStorage était
// trivialement contournable et n'a jamais été la vraie protection).
interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  return <>{children}</>;
};

export default PrivateRoute;
