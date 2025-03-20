const ApiData = async (category) => {
  const url = `https://api.themoviedb.org/3/${category}`;
  console.log("Fetching data for category:", category);
  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_MOVIE_TOKEN}`,
      accept: "application/json",
    },
  };
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const result = await response.json();
    return result.results || [];
  } catch (error) {
    console.error("from error" + error);
    return [];
  }
};
export default ApiData;
