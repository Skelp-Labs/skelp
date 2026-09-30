curl http://localhost:11434/api/generate -d '{
  "model": "gemma4:26b",
  "prompt": "How does the cat command work in one sentence?",
  "max_tokens": 10,
  "stream": true,
  "think": false
}'
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.592157788Z","response":"The","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.614145735Z","response":" `","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.614161465Z","response":"cat","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.61423752Z","response":"`","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.614252207Z","response":" command","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.638441583Z","response":" reads","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.656728266Z","response":" data","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.675134306Z","response":" from","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.675146058Z","response":" files","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.693503205Z","response":" or","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.711733612Z","response":" standard","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.730485749Z","response":" input","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.730495657Z","response":" and","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.730547736Z","response":" displays","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.748531635Z","response":" its","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.766537496Z","response":" entire","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.78461416Z","response":" contents","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.802548465Z","response":" sequentially","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.820682469Z","response":" to","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.839555365Z","response":" the","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.839571445Z","response":" terminal","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.839606472Z","response":" output","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.858592001Z","response":".","done":false}
{"model":"gemma4:26b","created_at":"2026-09-30T16:03:07.858657916Z","response":"","done":true,"done_reason":"stop","context":[2,105,2364,107,3910,1677,506,5866,4991,981,528,886,13315,236881,106,107,105,4368,107,100,45518,107,101,818,2165,9307,236929,4991,20838,1262,699,5734,653,4077,2744,532,19365,1061,4251,13269,85363,531,506,12612,3938,236761],"total_duration":371259194,"load_duration":1073817,"prompt_eval_count":23,"prompt_eval_cached_count":0,"prompt_eval_duration":56687000,"eval_count":24,"eval_duration":266406000}