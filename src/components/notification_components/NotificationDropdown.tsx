"use client";

import React from "react";
import {
  NotificationTrigger,
  NotificationDrawer,
} from "./NotificationDrawer";

interface NotificationDropdownProps {
  onClose?: () => void;
}

export const NotificationDropdown = ({
  onClose,
}: NotificationDropdownProps = {}) => {
  return <NotificationTrigger />;
};

export { NotificationTrigger, NotificationDrawer };
export default NotificationDropdown;
