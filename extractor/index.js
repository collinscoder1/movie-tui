fetch("https://h5-api.aoneroom.com/wefeed-h5api-bff/detail?detailPath=the-chi-0OZDg6KP353", {
  headers: {
    "accept": "application/json",
    "x-request-lang": "en",
    "x-client-info": "{\"timezone\":\"Africa/Nairobi\"}",
    "Referer": "https://downloader2.com/"
  },
  method: "GET"
})
  .then(res => res.json())
    .then(data => console.log(data.data.resource))
  .catch(err => console.error(err));
