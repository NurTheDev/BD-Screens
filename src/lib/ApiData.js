const ApiData = async ({ category }) => {
  const url = `https://imdb236.p.rapidapi.com/imdb/${category}`;
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": "810cfb728fmsh6ad252880ab1024p137915jsncb13b5173818",
      "x-rapidapi-host": "imdb236.p.rapidapi.com",
    },
  };

  let result = null;  // Define result initially as null

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error("Failed to fetch data");
    }
    result = await response.json();
    // console.log(result);  // Optionally log the result for debugging
  } catch (error) {
    console.error("Error:", error);
  }

  console.log("Result:", result); // Log result after checking for errors
  console.log("URL:", url, "Category:", category);

  return result;
};

export default ApiData;
