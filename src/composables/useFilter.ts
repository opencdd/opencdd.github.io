/**
 * Shared filter composable — encapsulates the query ref, normalization,
 * and computed filter logic used by every filterable list island.
 *
 * Before this composable, FilterableEntityList.vue and
 * FilterablePropertyList.vue each had their own copy of:
 *   const query = ref("")
 *   const q = computed(() => query.value.trim().toLowerCase())
 *   const filtered = computed(() => items.filter(...))
 *
 * Now both call useFilter with their own field extractor.
 */

import { ref, computed, unref, type Ref, type ComputedRef } from "vue";

export function useFilter<T>(
  items: Ref<readonly T[]> | ComputedRef<readonly T[]> | readonly T[],
  fields: (item: T) => readonly string[],
) {
  const query = ref("");
  const q = computed(() => query.value.trim().toLowerCase());

  const filtered = computed(() => {
    const vals = unref(items as Ref<readonly T[]>);
    if (!q.value) return vals;
    return vals.filter((item) =>
      fields(item).some((f) => f.toLowerCase().includes(q.value)),
    );
  });

  return { query, filtered };
}
