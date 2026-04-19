#!/usr/bin/env python3
"""
Filters /tmp/litellm_raw.json to the models IJFW tracks and writes
mcp-server/data/model_prices.json. Run by the refresh-prices GH Action
and optionally locally.
"""
import json
import datetime
import os
import sys

src = os.environ.get('LITELLM_SRC', '/tmp/litellm_raw.json')
out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   'mcp-server', 'data', 'model_prices.json')

with open(src) as f:
    data = json.load(f)

today = datetime.date.today().isoformat()
wanted = {}

for k, v in data.items():
    if k == 'sample_spec':
        continue
    provider = v.get('litellm_provider', '')
    lk = k.lower()
    if provider not in ('anthropic', 'openai', 'gemini',
                        'vertex_ai-language-models', 'vertex_ai'):
        continue
    if any(x in lk for x in ['claude', 'gpt-4', 'gpt-5', 'o1', 'o3-', 'o4-', 'gemini']):
        in_c  = v.get('input_cost_per_token', 0)
        out_c = v.get('output_cost_per_token', 0)
        if in_c or out_c:
            wanted[k] = {
                'input_cost_per_token': in_c,
                'output_cost_per_token': out_c,
                'cache_creation_input_token_cost': v.get('cache_creation_input_token_cost'),
                'cache_read_input_token_cost': v.get('cache_read_input_token_cost'),
                'litellm_provider': provider,
            }

output = {
    '_source': 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json',
    '_refreshed': today,
    'models': wanted,
}

with open(out, 'w') as f:
    json.dump(output, f, indent=2)

print(f'Wrote {len(wanted)} models to {out} ({today})')
