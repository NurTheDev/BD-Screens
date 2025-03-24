import React from "react";
import signInImg from "../assets/cover1.png";
import googleIcon from "../assets/Google.svg";
import facebookIcon from "../assets/Facebook.svg";
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
          <div className={"mt-5 lg:mt-0"}>
            <div>
              <h1 className={"text-heading-2 font-bold"}>Welcome Back 👋</h1>
              <p className={"text-light-gray"}>
                Sign in to explore your favourite movie
              </p>
            </div>
            <form className={"space-y-6 mt-4 flex justify-center flex-col"}>
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
