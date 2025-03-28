import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "../common/Navbar";
import Footer from "../common/Footer.jsx";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Bounce, toast } from "react-toastify";

const Index = () => {
  const auth = getAuth();
  const [authSatus, setAutStatus] = useState("loading");
  const navigate = useNavigate();

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        // User is signed in and email is verified
        setAutStatus("authenticated");
      } else if (user) {
        navigate("/signin");
        toast.error(`${"Verify your email first"}`, {
          position: "bottom-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
          transition: Bounce,
        });
      } else {
        setAutStatus("guest");
      }
    });
  }, []);
  return (
    <div>
      {(authSatus === "authenticated" || authSatus === "guest") && (
        <>
          <Navbar isGuest={authSatus === "guest"} />
          <Outlet />
          <Footer />
        </>
      )}
    </div>
  );
};

export default Index;
