import React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircle from "@mui/icons-material/AccountCircle";
import InfoIcon from "@mui/icons-material/Info";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import InvoiceIcon from "@mui/icons-material/Receipt";
import HomeIcon from "@mui/icons-material/Home";
import { Link } from "react-router-dom";
import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";

const Navbar = () => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (event.type === "keydown" && ((event as React.KeyboardEvent).key === "Tab" || (event as React.KeyboardEvent).key === "Shift")) {
      return;
    }
    setDrawerOpen(open);
  };

  const drawerItems = [
    { text: "Home", icon: <HomeIcon />, to: "/" },
    { text: "Invoice Management", icon: <InvoiceIcon />, to: "/invoice-manager" },
    { text: "About", icon: <InfoIcon />, to: "/about" },
    { text: "Profile", icon: <AccountCircle />, to: "/profile" },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          {/* Menu Icon for Drawer */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer(true)}
            sx={{ display: { xs: "block", sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          {/* App Name or Logo with Link */}
          <Typography variant="h6" component={Link} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
            Freya Hub
          </Typography>

          {/* Show AppBar Items only on larger screens */}
          <Box sx={{ display: { xs: "none", sm: "flex" } }}>
            {drawerItems.slice(0, 3).map((item) => (
              <IconButton
                key={item.text}
                color="inherit"
                component={Link}
                to={item.to}
              >
                <Tooltip title={item.text}>
                  {item.icon}
                </Tooltip>
              </IconButton>
            ))}
          </Box>

          {/* Profile Floating Action Button */}
          <Fab color="secondary" aria-label="profile" component={Link} to="/profile" sx={{ ml: 2, display: { xs: "none", sm: "flex" } }}>
            <AccountCircle />
          </Fab>
        </Toolbar>
      </AppBar>

      {/* Drawer for Mobile Navigation */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <List>
            {drawerItems.map((item) => (
              <ListItem component={Link} to={item.to} key={item.text}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};

export default Navbar;
