export function words(text) {
  return text.toLowerCase().normalize("NFKC").replace(/[’‘]/g, "'").match(/[\p{L}\p{N}]+(?:'[\p{L}]+)?/gu) || [];
}
export function compareWords(reference, transcript) {
  const expected = words(reference), actual = words(transcript);
  const dp = Array.from({length:expected.length + 1}, () => new Array(actual.length + 1).fill(0));
  for (let i=0; i<=expected.length; i++) dp[i][0]=i;
  for (let j=0; j<=actual.length; j++) dp[0][j]=j;
  for (let i=1; i<=expected.length; i++) for (let j=1; j<=actual.length; j++) dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(expected[i-1]===actual[j-1]?0:2));
  let i=expected.length,j=actual.length;
  const tokens=[];
  while(i||j) {
    if(i&&j&&dp[i][j]===dp[i-1][j-1]+(expected[i-1]===actual[j-1]?0:2)) { tokens.push({word:expected[i-1],heard:actual[j-1],status:expected[i-1]===actual[j-1]?"matched":"different"}); i--;j--; }
    else if(i&&dp[i][j]===dp[i-1][j]+1) { tokens.push({word:expected[i-1],heard:"",status:"missing"});i--; }
    else { tokens.push({word:actual[j-1],heard:actual[j-1],status:"extra"});j--; }
  }
  return { tokens:tokens.reverse(), reference, transcript };
}
export function speechMetrics(transcript, duration, segments=[]) {
  const valid = segments.filter(s=>Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.start>=0&&s.end>=s.start&&s.end<=duration+.5).sort((a,b)=>a.start-b.start);
  let longestPause = 0;
  for(let i=1;i<valid.length;i++) longestPause=Math.max(longestPause,valid[i].start-valid[i-1].end);
  return { wordCount:words(transcript).length, durationSeconds:Math.round(duration*10)/10, wordsPerMinute:Math.round(words(transcript).length*60/duration), longestPauseSeconds:valid.length>1?Math.round(longestPause*10)/10:null };
}
