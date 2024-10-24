import { Typography, Grid, Card, CardContent, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { DateTime, Duration, Interval } from "luxon";

export const Calendar = () => {
  const interval = Interval.fromDateTimes(
    DateTime.now().startOf("year"),
    DateTime.now().endOf("year")
  ).splitBy(
    Duration.fromObject({
      month: 1,
    })
  );
  const navigate = useNavigate();

  return (
    <Box padding="2rem" sx={{ backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Typography variant="h4" gutterBottom align="center" marginBottom="3rem">
        Invoices 2024
      </Typography>
      <Grid container spacing={2} justifyContent="center">
        {interval.map((month) => (
          <Grid item xs={6} sm={4} md={3} key={month.start?.month}>
            <Card
              variant="outlined"
              sx={{
                backgroundColor: "#1976d2",
                color: "#fff",
                "&:hover": { backgroundColor: "#1565c0" },
                cursor: "pointer",
                height: "100%",
                borderRadius: "12px",
                boxShadow: 2,
              }}
              onClick={() => navigate(`/all-invoices?month=${month.start?.month}&year=${month.start?.year}`)}
            >
              <CardContent>
                <Typography variant="h5" align="center">
                  {month.start?.toFormat('LLLL')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
