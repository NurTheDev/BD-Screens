import React, { useState } from "react";
import signInImg from "../assets/cover2.png";
import { Link } from "react-router-dom";
import { Flip, toast } from "react-toastify";
import avatar from "../assets/avatar.gif";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";
import { ClipLoader } from "react-spinners";

function Signin() {
  const [input, setInput] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState({ fullName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [verify, setVerify] = useState(false);
  const auth = getAuth();
  const neonGlowOverride = {
    display: "block",
    margin: "0 auto",
    borderColor: "#ff6ec7", // Hot pink color
    boxShadow: "0 0 15px #ff6ec7", // Neon glow
  };
  const handleSubmit = (e) => {
    e.preventDefault();

    const newError = { fullName: "", email: "", password: "" };
    Object.keys(input).forEach((key) => {
      if (!input[key]) {
        newError[key] = `This field is required`;
      }
      if (key === "password" && key === input[key].length < 6) {
        newError[key] = "Password must be at least 6 characters";
      }
    });
    setError(newError);
    const hasErrors = Object.values(newError).some((value) => value !== "");
    if (!hasErrors) {
      setLoading(true);
      createUserWithEmailAndPassword(auth, input.email, input.password)
        .then((userCredential) => {
          // Signed up
          const user = userCredential.user;
          updateProfile(user, {
            displayName: input.fullName,
            uid: user.uid,
            email: user.email,
            photo_url: "",
          });
          return user;
        })
        .then((data) => {
          console.log(data);
          const db = getDatabase();
          set(ref(db, "users/" + data.uid), {
            fullName: input.fullName || "",
            email: data.email || "",
            userId: data.uid || "",
            profile_picture: data.photoURL || avatar,
          });
        })
        .then(() => {
          toast.success("Account Created Successfully", {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
            transition: Flip,
          });
          sendEmailVerification(auth.currentUser);
        })
        .then(() => {
          setVerify(true);
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          if (errorCode === "auth/email-already-in-use") {
            setError({ ...error, email: "Email already in use" });
          } else if (errorMessage.includes("email")) {
            setError({ ...error, email: "Invalid email" });
          } else if (errorMessage.includes("password")) {
            setError({ ...error, password: "Invalid password" });
          }
          console.log("errorCode:" + errorCode, "errorMessage:" + errorMessage);
          // ..
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };
  return (
    <div className={"relative"}>
      {loading && (
        <ClipLoader
          color="#f41b3b"
          size={150}
          speedMultiplier={1.2}
          loading={true}
          cssOverride={neonGlowOverride}
          className={
            "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          }
        />
      )}
      {verify && (
        <div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primaryColor px-6 py-2 rounded-lg">
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button
                className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                onClick={() => setVerify(false)}
              >
                ✕
              </button>
            </form>
            <h3 className="font-bold text-lg w-11/12">
              {input.fullName} to login you need to Verify your email
            </h3>
            <p className="py-4">
              a verify email has been send to {input.email}
            </p>
            <Link to={"/signin"} className={"text-center"}>
              Log in
            </Link>
          </div>
        </div>
      )}
      <div
        className={`grid lg:grid-cols-2 min-h-screen ${loading && "opacity-30"}`}
      >
        <div
          className={
            "flex lg:order-2 order-1 justify-center items-center h-full"
          }
        >
          <div>
            <div className={"mt-5 lg:mt-0"}>
              <h1 className={"text-heading-2 font-bold"}>Explore the Movies</h1>
              <p className={"text-light-gray"}>
                Sign up to watch your favourite movies
              </p>
            </div>
            <form
              className={"space-y-6 mt-4 flex justify-center flex-col"}
              onSubmit={handleSubmit}
            >
              <div>
                <label className="fieldset-label">Full Name</label>
                <input
                  type="text"
                  className="input w-full mt-2"
                  placeholder="Enter your full name"
                  onChange={(e) =>
                    setInput({ ...input, fullName: e.target.value })
                  }
                />
                <span>{error.fullName}</span>
              </div>
              <div>
                <label className="fieldset-label">Email</label>
                <input
                  type="email"
                  className="input w-full mt-2"
                  placeholder="Email"
                  onChange={(e) =>
                    setInput({ ...input, email: e.target.value })
                  }
                />
                <span>{error.email}</span>
              </div>
              <div>
                <label className="fieldset-label">Password</label>
                <input
                  type="password"
                  className="input w-full mt-2"
                  placeholder="Password"
                  onChange={(e) =>
                    setInput({ ...input, password: e.target.value })
                  }
                />
                <span>{error.password}</span>
              </div>
              <button className="btn mt-4">Sign up</button>
            </form>
            <p className={"text-light-gray text-center mt-5"}>
              Already you have an account?{" "}
              <Link
                to={"/signin"}
                className={"text-primaryColor cursor-pointer hover:scale-105"}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
        <div className={"lg:order-2"}>
          <picture>
            <img
              src={signInImg || undefined}
              alt=""
              className={"object-cover object-center h-full"}
            />
          </picture>
        </div>
      </div>
    </div>
  );
}

export default Signin;
