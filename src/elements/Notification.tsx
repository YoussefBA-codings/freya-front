interface NotificationProps {
  message: string;
  type: string;
}

const Notification: React.FC<NotificationProps> = ({ message, type }) => {
  const notificationStyle = {
    position: "fixed" as const,
    bottom: "20px",
    right: "20px",
    backgroundColor: type === "success" ? "green" : "red",
    color: "white",
    padding: "10px 20px",
    borderRadius: "5px",
    zIndex: 1000,
  };

  return <div style={notificationStyle}>{message}</div>;
};

export default Notification;
