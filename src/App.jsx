/**
 * @file App.jsx
 * @description Route table.
 *
 * Structure: one public layout (`SiteLayout`) that owns the navbar/footer, plus
 * two full-screen surfaces that hide the chrome on purpose — the watch page
 * (theatre) and auth (split screen).
 *
 * All pages are code-split, so a first visit downloads the home page only.
 */

import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { SiteLayout } from "./components/layout/SiteLayout.jsx";
import { PageLoader } from "./components/layout/PageLoader.jsx";
import { Home } from "./pages/Home.jsx";

/* Home ships in the main bundle (it is the landing page); the rest are split. */
const Browse = lazy(() => import("./pages/Browse.jsx"));
const Discover = lazy(() => import("./pages/Discover.jsx"));
const TitleDetail = lazy(() => import("./pages/TitleDetail.jsx"));
const Watch = lazy(() => import("./pages/Watch.jsx"));
const Party = lazy(() => import("./pages/Party.jsx"));
const Search = lazy(() => import("./pages/Search.jsx"));
const Watchlist = lazy(() => import("./pages/Watchlist.jsx"));
const SignIn = lazy(() => import("./pages/SignIn.jsx"));
const SignUp = lazy(() => import("./pages/SignUp.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="browse" element={<Browse />} />
          <Route path="discover" element={<Discover />} />
          <Route path="search" element={<Search />} />
          <Route path="watchlist" element={<Watchlist />} />
          <Route path="title/:id" element={<TitleDetail />} />
          <Route path="party" element={<Party />} />
          <Route path="party/:code" element={<Party />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Theatre: no navbar, no footer, full attention. */}
        <Route path="watch/:id" element={<Watch />} />

        {/* Auth: split-screen, its own layout. */}
        <Route path="signin" element={<SignIn />} />
        <Route path="signup" element={<SignUp />} />
      </Routes>
    </Suspense>
  );
}
