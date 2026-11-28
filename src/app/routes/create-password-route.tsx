import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { InvitationPage } from "@/features/user-invitation/components/invitation-page";

import { getApiClient } from "../api-client";
import { EndOpenSession } from "./end-open-session";

export function CreatePasswordRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  if (createdEmail !== null) {
    return (
      <EndOpenSession
        onEnded={() => navigate("/entrar", { state: { createdEmail } })}
      />
    );
  }

  return (
    <InvitationPage
      apiClient={getApiClient()}
      navigationKey={location.key}
      onPasswordCreated={setCreatedEmail}
    />
  );
}
