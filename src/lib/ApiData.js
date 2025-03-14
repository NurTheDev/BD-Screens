const ApiData = async (data) => {
  const url = `https://imdb236.p.rapidapi.com/imdb/${data}`;
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": "810cfb728fmsh6ad252880ab1024p137915jsncb13b5173818",
      "x-rapidapi-host": "imdb236.p.rapidapi.com",
    },
  };
  let result;
  console.log(url);
  try {
    const response = await fetch(url, options);
    result = await response.json();
    // console.log(result);
  } catch (error) {
    console.error("from error" + error);
  }
  console.log(result);

  return result;
};
export default ApiData;
