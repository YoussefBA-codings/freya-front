import { Container, Box, Typography, Avatar, Paper, Grid, Chip, Divider } from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import EmailIcon from "@mui/icons-material/Email";
import BadgeIcon from "@mui/icons-material/Badge";
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
      <Paper elevation={3} sx={{ padding: 4, marginTop: 4, borderRadius: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
          <Avatar sx={{ width: 100, height: 100, backgroundColor: "#3f51b5", mb: 2 }}>
            <AccountCircleIcon sx={{ fontSize: 60 }} />
          </Avatar>
          <Typography variant="h4" component="div" fontWeight="bold" textAlign="center">
            {userData.firstName} {userData.lastName}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            {userData.role}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
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

        {/* Additional Details */}
        <Box mt={3} textAlign="center">
          <Chip
            icon={<BadgeIcon />}
            label={`${userData.firstName} ${userData.lastName} - ${userData.role}`}
            color="primary"
            sx={{ mr: 1 }}
          />
          <Chip
            icon={<GroupIcon />}
            label={`Team: ${userData.team}`}
            color="secondary"
          />
        </Box>
      </Paper>
    </Container>
  );
};

export default UserProfile;