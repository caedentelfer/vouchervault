import { Button, Container, Typography } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React, { useEffect } from "react";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

const Home: React.FC = () => {
  const router = useRouter();
  const { connected, connect } = useWallet();
  const { setVisible } = useWalletModal();

  const connectWallet = async () => {
    setVisible(true);
  };

  useEffect(() => {
    if (connected) {
      router.push("/user-type");
    }
  }, [connected, router]);

  return (
    <Container
      component="main"
      maxWidth="xs"
      style={{ textAlign: "center", marginTop: "5rem" }}
    >
      <Typography
        variant="h3"
        style={{ fontWeight: 'bold', marginBottom: '4rem' }}
      >
        Welcome to Voucher Vault
      </Typography>
      <Typography
        variant="h5"
        gutterBottom
        style={{ marginBottom: '1rem' }}
      >
        Connect a wallet to continue
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={connectWallet}
        style={{
          marginTop: "2rem",
          padding: "1rem 2rem",
          fontSize: "1.25rem",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 8px rgba(0,0,0,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
        }}
      >
        Connect Wallet
      </Button>
    </Container>
  );
};

export default Home;