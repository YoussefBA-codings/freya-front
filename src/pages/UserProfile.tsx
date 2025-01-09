import { Container, Box, Typography, Avatar, Paper, Grid } from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import EmailIcon from "@mui/icons-material/Email";
import GroupIcon from "@mui/icons-material/Group";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

const UserProfile = () => {
  const userData = {
    email: "admin@freya.com",
    firstName: "Youssef",
    lastName: "Ben Amor",
    role: "Admin",
    team: "Dev",
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ padding: 4, marginTop: 4, borderRadius: 2 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <Avatar sx={{ width: 80, height: 80, backgroundColor: "#3f51b5" }}>
            <AccountCircleIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h5" component="div" textAlign="center" mt={2}>
            {userData.firstName} {userData.lastName}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {userData.role}
          </Typography>
        </Box>

        <Grid container spacing={1}>
          {/* Email Section */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center">
              <EmailIcon color="action" sx={{ mr: 1 }} />
              <Typography variant="body1">
                <strong>Email:</strong> {userData.email}
              </Typography>
            </Box>
          </Grid>

          {/* Role Section */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center">
              <AdminPanelSettingsIcon color="action" sx={{ mr: 1 }} />
              <Typography variant="body1">
                <strong>Role:</strong> {userData.role}
              </Typography>
            </Box>
          </Grid>

          {/* Team Section */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center">
              <GroupIcon color="action" sx={{ mr: 1 }} />
              <Typography variant="body1">
                <strong>Team:</strong> {userData.team}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default UserProfile;
