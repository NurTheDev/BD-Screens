import React, { useState } from "react";
import signInImg from "../assets/cover2.png";
import { Link } from "react-router-dom";

// import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

function Signin() {
  const [input, setInput] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState({ fullName: "", email: "", password: "" });
  // const auth = getAuth();
  const handleSubmit = (e) => {
    e.preventDefault();
    // if (input.fullName === "") {
    //   setError({ ...error, fullName: "You must enter your name" });
    //   if (input.fullName.length < 2) {
    //     setError({ ...error, fullName: "Name must be at least 2 characters" });
    //   }
    // }
    // if (input.email === "") {
    //   setError({ ...error, email: "You must enter your email" });
    // }
    // if (input.password === "") {
    //   setError({ ...error, password: "You must enter your password" });
    //   if (input.password.length < 6) {
    //     setError({
    //       ...error,
    //       password: "Password must be at least 6 characters",
    //     });
    //   }
    // }
    const newError = { fullName: "", email: "", password: "" };
    Object.keys(input).forEach((key) => {
      if (!input[key]) {
        newError[key] = `This field is required`;
      }
      if (input.password && key === input[key].length < 6) {
        newError[key] = "Password must be at least 6 characters";
      }
    });
    setError(newError);
  };
  return (
    <div>
      <div className={"grid lg:grid-cols-2 min-h-screen"}>
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
