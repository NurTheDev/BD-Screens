const url = 'https://imdb236.p.rapidapi.com/imdb/top250-movies';
const options = {
	method: 'GET',
	headers: {
		'x-rapidapi-key': '810cfb728fmsh6ad252880ab1024p137915jsncb13b5173818',
		'x-rapidapi-host': 'imdb236.p.rapidapi.com'
	}
};
let result;

try {
  const response = await fetch(url, options);
  result = await response.json();
  // console.log(result);
} catch (error) {
  console.error(error);
}
export default result;
