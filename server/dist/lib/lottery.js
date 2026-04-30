export function pickWeightedUnique(userIds, weights, count) {
    const entries = [];
    for (let i = 0; i < userIds.length; i++) {
        const w = Math.max(0, Math.floor(weights[i] ?? 0));
        for (let j = 0; j < w; j++)
            entries.push(userIds[i]);
    }
    if (entries.length === 0)
        return [];
    const picked = new Set();
    const cap = Math.min(count, new Set(userIds).size);
    let guard = 0;
    while (picked.size < cap && guard < cap * 2000) {
        guard++;
        const r = entries[Math.floor(Math.random() * entries.length)];
        picked.add(r);
    }
    return [...picked];
}
export function pickUniformUnique(userIds, count) {
    const uniq = [...new Set(userIds)];
    for (let i = uniq.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniq[i], uniq[j]] = [uniq[j], uniq[i]];
    }
    return uniq.slice(0, Math.min(count, uniq.length));
}
