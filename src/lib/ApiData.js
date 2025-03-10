const url =
  "https://movie-database-api1.p.rapidapi.com/list_movies.json?limit=20&page=1&quality=all&genre=all&minimum_rating=0&query_term=0&sort_by=date_added&order_by=desc&with_rt_ratings=false";
const options = {
  method: "GET",
  headers: {
    "x-rapidapi-key": "65b3bb784emsh6e59ed2d0f89185p147e1djsn4f9b475e7a11",
    "x-rapidapi-host": "movie-database-api1.p.rapidapi.com",
  },
};

let result;

try {
  const response = await fetch(url, options);
  result = await response.json();
  console.log(result);
} catch (error) {
  console.error(error);
}
export default result;
