import React, { useState } from "react";
import signInImg from "../assets/cover1.png";
import googleIcon from "../assets/Google.svg";
import facebookIcon from "../assets/Facebook.svg";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { ClipLoader } from "react-spinners";
import { Bounce, toast } from "react-toastify";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";

function Signin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [verify, setVerify] = useState(false);
  const neonGlowOverride = {
    display: "block",
    margin: "0 auto",
    borderColor: "#ff6ec7", // Hot pink color
    boxShadow: "0 0 15px #ff6ec7", // Neon glow
  };
  const auth = getAuth();
  const [input, setInput] = useState({ email: "", password: "" });
  const [error, setError] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const handleSubmit = (e) => {
    e.preventDefault();
    const newError = { email: "", password: "" };
    Object.keys(input).forEach((key) => {
      if (!input[key]) {
        newError[key] = `This field is required`;
      }
    });
    setError(newError);
    const hasErrors = Object.values(newError).some((value) => value !== "");
    if (!hasErrors) {
      setLoading(true);
      console.log(input.email, input.password);
      signInWithEmailAndPassword(auth, input.email, input.password)
        .then((userCredential) => {
          // Signed in
          const user = userCredential.user;
          console.log(user);
          if (user.emailVerified) {
            navigate("/");
          } else {
            setVerify(true);
          }
          // ...
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;

          console.log(errorCode, errorMessage);
          toast.error(
            `${errorCode.includes("auth/invalid-credential") && "Create an account first"}`,
            {
              position: "bottom-center",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: false,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "dark",
              transition: Bounce,
            },
          );
          if (errorMessage.includes("email")) {
            setError({ ...error, email: "Invalid email" });
          } else if (errorMessage.includes("password")) {
            setError({ ...error, password: "Invalid password" });
          }
        })
        .finally(() => setLoading(false));
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
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primaryColor px-6 py-5 rounded-lg w-1/2 z-1">
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
              To login you need to Verify your email first
            </h3>
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
          <div className={"mt-5 lg:mt-0"}>
            <div>
              <h1 className={"text-heading-2 font-bold"}>Welcome Back 👋</h1>
              <p className={"text-light-gray"}>
                Sign in to explore your favourite movie
              </p>
            </div>
            <form
              className={"space-y-6 mt-4 flex justify-center flex-col"}
              onSubmit={handleSubmit}
            >
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
                <div className={"relative"}>
                  <input
                    type={`${showPassword ? "text" : "password"}`}
                    className="input w-full mt-2 "
                    placeholder="Password"
                    onChange={(e) =>
                      setInput({ ...input, password: e.target.value })
                    }
                  />
                  <span
                    className={
                      "absolute top-5 right-4 transform cursor-pointer"
                    }
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <IoMdEye /> : <IoMdEyeOff />}
                  </span>
                </div>
                <span>{error.password}</span>
              </div>
              <button className="btn mt-4">Login</button>
            </form>
            <p className={"text-light-gray customBorder text-center mt-5"}>
              Or
            </p>
            <div className={"flex justify-center flex-col"}>
              <div className="btn mt-4">
                <span>
                  <img
                    src={googleIcon || undefined}
                    alt={googleIcon || undefined}
                  />
                </span>
                <span>Sign in with Google</span>
              </div>{" "}
              <div className="btn mt-4">
                <span>
                  <img
                    src={facebookIcon || undefined}
                    alt={facebookIcon || undefined}
                  />
                </span>
                <span>Sign in with Facebook</span>
              </div>
            </div>
            <p className={"text-light-gray text-center mt-5"}>
              Don&#39;t you have an account?{" "}
              <Link
                to={"/signup"}
                className={"text-primaryColor cursor-pointer hover:scale-105"}
              >
                Sign up
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
