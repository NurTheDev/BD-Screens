import React from "react";
import { Link } from "react-router-dom";

function Error() {
  return (
    <div className={"errorBody"}>
      <header className="top-header"></header>

      {/*// <!--dust particel-->*/}
      <div>
        <div className="starsec"></div>
        <div className="starthird"></div>
        <div className="starfourth"></div>
        <div className="starfifth"></div>
      </div>
      {/*<!--Dust particle end--->*/}

      <div className="lamp__wrap">
        <div className="lamp">
          <div className="cable"></div>
          <div className="cover"></div>
          <div className="in-cover">
            <div className="bulb"></div>
          </div>
          <div className="light"></div>
        </div>
      </div>
      {/*// <!-- END Lamp -->*/}
      <section className="error">
        {/*// <!-- Content -->*/}
        <div className="error__content">
          <div className="error__message message">
            <h1 className="message__title">Page Not Found</h1>
            <p className="message__text">
              The page you are looking for is still under construction or the
              developer is too lazy to build it. Please check back later.
            </p>
          </div>
          <div className="error__nav e-nav">
            <Link to={"/"} className="e-nav__link"></Link>
          </div>
        </div>
        {/*// <!-- END Content -->*/}
      </section>
    </div>
  );
}

export default Error;
