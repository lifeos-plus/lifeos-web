import { useState, useMemo, useCallback } from "react";
import type { Note } from "@/types/newNotes";
import type { PersonSummary, Tag } from "@/services/api";
import type { NoteStats } from "@/services/api/notes";
import type { UUID } from "@/types/primitive";

export function useNoteFilters(
  notes: Note[],
  stats: NoteStats | null,
  onLoadFilteredNotes: (
    filter: {
      tag_id?: UUID;
      person_id?: UUID;
      task_id?: UUID;
      keyword?: string;
      untagged?: boolean;
    } | null,
  ) => Promise<void>,
) {
  const [selectedFilterTags, setSelectedFilterTags] = useState<Tag[]>([]);
  const [selectedFilterPersons, setSelectedFilterPersons] = useState<
    PersonSummary[]
  >([]);
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [isSearchApplied, setIsSearchApplied] = useState<boolean>(false);
  const [selectedFilterTaskId, setSelectedFilterTaskId] = useState<
    string | null
  >(null);
  const [showUntaggedOnly, setShowUntaggedOnly] = useState<boolean>(false);

  // This maintains the original behavior where clicking tag/person immediately filters
  const filteredNotes = useMemo(() => {
    if (showUntaggedOnly) {
      return notes.filter((note) => !note.tags || note.tags.length === 0);
    }
    if (selectedFilterTags.length === 1) {
      return notes.filter((note) =>
        note.tags?.some((tag) => tag.id === selectedFilterTags[0].id),
      );
    }
    if (selectedFilterPersons.length === 1) {
      return notes.filter((note) =>
        note.person?.some(
          (person) => person.id === selectedFilterPersons[0].id,
        ),
      );
    }
    if (selectedFilterTaskId != null) {
      return notes.filter(
        (note) => note.task?.id === String(selectedFilterTaskId),
      );
    }
    return notes;
  }, [
    notes,
    selectedFilterTags,
    selectedFilterPersons,
    selectedFilterTaskId,
    showUntaggedOnly,
  ]);

  // Use server-side statistics instead of local calculation
  const tagUsageStats = useMemo(() => {
    if (!stats) return {};

    const tagStats: { [key: UUID]: number } = {};
    stats.tag_stats.forEach((tagStat) => {
      tagStats[tagStat.id] = tagStat.usage_count;
    });
    return tagStats;
  }, [stats]);

  const personUsageStats = useMemo(() => {
    if (!stats) return {};

    const personStats: { [key: UUID]: number } = {};
    stats.person_stats.forEach((personStat) => {
      personStats[personStat.id] = personStat.usage_count;
    });
    return personStats;
  }, [stats]);

  const uniquePersons = useMemo(() => {
    if (!stats) return [];

    return stats.person_stats
      .map((personStat) => ({
        id: personStat.id,
        name: personStat.name,
        display_name: personStat.display_name,
        primary_nickname: personStat.display_name,
        birth_date: null,
        location: null,
        tags: [],
      }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [stats]);

  const handleTagClick = useCallback(
    async (tag: Tag) => {
      if (selectedFilterTags.some((t) => t.id === tag.id)) {
        setSelectedFilterTags([]);
        setSelectedFilterPersons([]);
        setSelectedFilterTaskId(null);
        setShowUntaggedOnly(false);
        await onLoadFilteredNotes(null);
      } else {
        setSelectedFilterTags([tag]);
        setSelectedFilterPersons([]);
        setSelectedFilterTaskId(null);
        setShowUntaggedOnly(false);
        await onLoadFilteredNotes({ tag_id: tag.id });
      }
    },
    [selectedFilterTags, onLoadFilteredNotes],
  );

  const handlePersonClick = useCallback(
    async (person: PersonSummary) => {
      if (selectedFilterPersons.some((p) => p.id === person.id)) {
        setSelectedFilterPersons([]);
        setSelectedFilterTags([]);
        setSelectedFilterTaskId(null);
        setShowUntaggedOnly(false);
        await onLoadFilteredNotes(null);
      } else {
        setSelectedFilterPersons([person]);
        setSelectedFilterTags([]);
        setSelectedFilterTaskId(null);
        setShowUntaggedOnly(false);
        await onLoadFilteredNotes({ person_id: person.id });
      }
    },
    [selectedFilterPersons, onLoadFilteredNotes],
  );

  const handleTaskClick = useCallback(
    async (taskId: UUID) => {
      if (selectedFilterTaskId === String(taskId)) {
        setSelectedFilterTaskId(null);
        setSelectedFilterTags([]);
        setSelectedFilterPersons([]);
        setShowUntaggedOnly(false);
        await onLoadFilteredNotes(null);
      } else {
        setSelectedFilterTaskId(taskId);
        setSelectedFilterTags([]);
        setSelectedFilterPersons([]);
        setShowUntaggedOnly(false);
        await onLoadFilteredNotes({ task_id: taskId });
      }
    },
    [selectedFilterTaskId, onLoadFilteredNotes],
  );

  const handleUntaggedToggle = useCallback(async () => {
    if (showUntaggedOnly) {
      setShowUntaggedOnly(false);
      setSelectedFilterTags([]);
      setSelectedFilterPersons([]);
      await onLoadFilteredNotes(null);
    } else {
      setShowUntaggedOnly(true);
      setSelectedFilterTags([]);
      setSelectedFilterPersons([]);
      await onLoadFilteredNotes({ untagged: true });
    }
  }, [showUntaggedOnly, onLoadFilteredNotes]);

  const applyTextSearch = useCallback(async () => {
    setIsSearchApplied(true);

    if (searchKeyword.trim()) {
      const filter: {
        tag_id?: UUID;
        person_id?: UUID;
        task_id?: string;
        keyword?: string;
        untagged?: boolean;
      } = {};

      if (selectedFilterTags.length === 1) {
        filter.tag_id = selectedFilterTags[0].id;
      }
      if (selectedFilterPersons.length === 1) {
        filter.person_id = selectedFilterPersons[0].id;
      }
      if (selectedFilterTaskId != null) {
        filter.task_id = selectedFilterTaskId;
      }
      if (showUntaggedOnly) {
        filter.untagged = true;
      }
      filter.keyword = searchKeyword.trim();

      await onLoadFilteredNotes(filter);
    } else {
      const filter: {
        tag_id?: UUID;
        person_id?: UUID;
        task_id?: string;
        untagged?: boolean;
      } | null = {};

      if (selectedFilterTags.length === 1) {
        filter.tag_id = selectedFilterTags[0].id;
      }
      if (selectedFilterPersons.length === 1) {
        filter.person_id = selectedFilterPersons[0].id;
      }
      if (selectedFilterTaskId != null) {
        filter.task_id = selectedFilterTaskId;
      }
      if (showUntaggedOnly) {
        filter.untagged = true;
      }

      if (Object.keys(filter).length > 0) {
        await onLoadFilteredNotes(filter);
      } else {
        await onLoadFilteredNotes(null);
      }
    }
  }, [
    selectedFilterTags,
    selectedFilterPersons,
    selectedFilterTaskId,
    showUntaggedOnly,
    searchKeyword,
    onLoadFilteredNotes,
  ]);

  const clearAllFilters = useCallback(async () => {
    setSelectedFilterTags([]);
    setSelectedFilterPersons([]);
    setSearchKeyword("");
    setIsSearchApplied(false);
    setShowUntaggedOnly(false);
    setSelectedFilterTaskId(null);
    await onLoadFilteredNotes(null);
  }, [onLoadFilteredNotes]);

  return {
    selectedFilterTaskId,
    selectedFilterTags,
    selectedFilterPersons,
    showUntaggedOnly,

    filteredNotes,
    tagUsageStats,
    personUsageStats,
    uniquePersons,

    handleTagClick,
    handlePersonClick,
    handleTaskClick,
    handleUntaggedToggle,
    applyTextSearch,
    clearAllFilters,

    isSearchApplied,
    searchKeyword,

    setSelectedFilterTag: (tag: Tag | null) =>
      setSelectedFilterTags(tag ? [tag] : []),
    setSelectedFilterPerson: (person: PersonSummary | null) =>
      setSelectedFilterPersons(person ? [person] : []),
    setSearchKeyword,
  };
}
