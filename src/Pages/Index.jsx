import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "../common/Navbar";
import Footer from "../common/Footer.jsx";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Bounce, toast } from "react-toastify";

const Index = () => {
  const auth = getAuth();
  const [verify, setVerify] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user.emailVerified) {
        // User is signed in and email is verified
        setVerify(true);
      } else {
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
      }
    });
  }, []);
  return (
    <div>
      {verify && (
        <>
          <Navbar />
          <Outlet />
          <Footer />
        </>
      )}
    </div>
  );
};

export default Index;
