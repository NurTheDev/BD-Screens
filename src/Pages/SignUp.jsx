import React from "react";
import signInImg from "../assets/cover2.png";
import { Link } from "react-router-dom";
function Signin() {
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
            <form className={"space-y-6 mt-4 flex justify-center flex-col"}>
              <div>
                <label className="fieldset-label">Full Name</label>
                <input
                  type="email"
                  className="input w-full mt-2"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="fieldset-label">Email</label>
                <input
                  type="email"
                  className="input w-full mt-2"
                  placeholder="Email"
                />
              </div>

              <div>
                <label className="fieldset-label">Password</label>
                <input
                  type="password"
                  className="input w-full mt-2"
                  placeholder="Password"
                />
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
