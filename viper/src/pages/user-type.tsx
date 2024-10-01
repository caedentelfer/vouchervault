// pages/user-type.tsx
import Business from "@mui/icons-material/Business";
import Engineering from "@mui/icons-material/Engineering";
import Star from "@mui/icons-material/Star";
import { Card, CardContent, Container, Grid, Typography } from "@mui/material";
import { useRouter } from "next/router";
import React from "react";

const UserTypeSelector: React.FC = () => {
  const router = useRouter();

  const handleUserTypeSelection = (type: string) => {
    // Redirect to the corresponding dashboard based on the selected user type
    router.push(`/${type}/dashboard`);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transform = "scale(1.05)";
    card.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.2)";
    card.style.backgroundColor = "#f5f5f5"; // Slightly gray background on hover

    // Increase font size for Typography components
    const textElements = card.querySelectorAll(".card-text");
    textElements.forEach((element) => {
      (element as HTMLElement).style.transform = "scale(1.1)";
      (element as HTMLElement).style.transition = "transform 0.3s ease";
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transform = "scale(1)";
    card.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
    card.style.backgroundColor = "#fff"; // Default white background

    // Reset font size for Typography components
    const textElements = card.querySelectorAll(".card-text");
    textElements.forEach((element) => {
      (element as HTMLElement).style.transform = "scale(1)";
      (element as HTMLElement).style.transition = "transform 0.3s ease";
    });
  };

  return (
    <Container
      maxWidth="md"
      style={{
        marginTop: "5rem",
        textAlign: "center",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Grid
        container
        spacing={4}
        justifyContent="center" // Center items horizontally
      >
        <Grid item xs={12} sm={4} md={3}>
          <Card
            onClick={() => handleUserTypeSelection("issuer")}
            style={{
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "2rem",
              textAlign: "center",
              height: "100%",
              transition: "transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              backgroundColor: "#fff", // Default background
              color: "#000", // Default text color
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <CardContent style={{ flexGrow: 1 }}>
              <Business fontSize="large" style={{ fontSize: "3rem" }} />
              <Typography variant="h5" className="card-text" style={{ marginTop: "1rem", fontSize: "1.5rem" }}>
                Issuer
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={3}>
          <Card
            onClick={() => handleUserTypeSelection("influencer")}
            style={{
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "2rem",
              textAlign: "center",
              height: "100%",
              transition: "transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              backgroundColor: "#fff", // Default background
              color: "#000", // Default text color
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <CardContent style={{ flexGrow: 1 }}>
              <Star fontSize="large" style={{ fontSize: "3rem" }} />
              <Typography variant="h5" className="card-text" style={{ marginTop: "1rem", fontSize: "1.5rem" }}>
                Influencer
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={3}>
          <Card
            onClick={() => handleUserTypeSelection("manufacturer")}
            style={{
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "2rem",
              textAlign: "center",
              height: "100%",
              transition: "transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              backgroundColor: "#fff", // Default background
              color: "#000", // Default text color
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <CardContent style={{ flexGrow: 1 }}>
              <Engineering fontSize="large" style={{ fontSize: "3rem" }} />
              <Typography variant="h5" className="card-text" style={{ marginTop: "1rem", fontSize: "1.5rem" }}>
                Manufacturer
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UserTypeSelector;
