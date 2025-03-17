// const ApiData = async ({ category }) => {
//   const url = `https://imdb236.p.rapidapi.com/imdb/${category}`;
//   const options = {
//     method: "GET",
//     headers: {
//       "x-rapidapi-key": "810cfb728fmsh6ad252880ab1024p137915jsncb13b5173818",
//       "x-rapidapi-host": "imdb236.p.rapidapi.com",
//     },
//   };
//   let result;
//   try {
//     const response = await fetch(url, options);
//     result = await response.json();
//     // console.log(result);
//   } catch (error) {
//     console.error("from error" + error);
//   }
//   console.log(result);
//   console.log(url, category);
//
//   return result;
// };
// export default ApiData;
// --url 'https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc' \
//      --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NWQ3NTE1MmVlNGM2ZmNiNjQ1MjRmNGJjZjMyM2ZmNCIsIm5iZiI6MTc0MTYyNTQ3Ny4zMDQsInN1YiI6IjY3Y2YxODg1NjY3NmU5OTQwMDEwZjdhYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.fI9FtQkUG77XUGvk5jGTOh1bX7RmbWhIs_7Kur9zbuU' \
//      --header 'accept: application/json'

const ApiData = async () => {
  const url =
    "https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc";
  const options = {
    method: "GET",
    headers: {
      Authorization:
        " Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NWQ3NTE1MmVlNGM2ZmNiNjQ1MjRmNGJjZjMyM2ZmNCIsIm5iZiI6MTc0MTYyNTQ3Ny4zMDQsInN1YiI6IjY3Y2YxODg1NjY3NmU5OTQwMDEwZjdhYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.fI9FtQkUG77XUGvk5jGTOh1bX7RmbWhIs_7Kur9zbuU",
      accept: "application/json",
    },
  };
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const result = await response.json();
    // console.log(result);
    return result.results;
  } catch (error) {
    console.error("from error" + error);
    return [];
  }
};
export default ApiData;
