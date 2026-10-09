/**
 * Per-dictionary metadata.
 *
 * The browser's `index.json` (built by `rake browser:build` in
 * cdd-data) carries only the slug, parcel ID, source language, and
 * entity counts. The human-readable bibliographic metadata — title,
 * IEC publication reference, edition, abstract —
 * lives here. This is the right place: the metadata is editorial,
 * changes rarely, and is easier to update than the data pipeline.
 *
 * Abstracts are quoted (often verbatim) from the IEC webstore listings
 * for each standard. The canonical publications are © IEC, Geneva; see
 * https://webstore.iec.ch/ for the normative text.
 */

export interface DictMetadata {
  /** IEC publication reference, e.g. "IEC 61360-1:2017". */
  publicationId: string;
  /** Edition, e.g. "4.0" or "1.0". */
  edition: string;
  /** Full canonical title of the IEC publication. */
  title: string;
  /** Short, scannable label for cards and headers. */
  shortTitle: string;
  /** Abstract / scope, quoted from the IEC webstore where possible. */
  abstract: string;
  /** Direct link to the IEC webstore publication page. */
  webstoreUrl: string;
  /** Optional: publication year. */
  publishedYear?: number;
  /**
   * True if this dictionary is a demonstration fixture rather than a
   * published IEC standard. Surfaced in the UI as a "Demonstration"
   * badge so users do not confuse it with real published data.
   */
  demonstration?: boolean;
  /**
   * What the dictionary is for, shown as a chip on the dictionaries
   * index: learning resources teach the meta-model; IEC dictionaries
   * are reference data served under the EULA.
   */
  profile?: string;
}

export const DICT_METADATA: Record<string, DictMetadata> = {
  "iec-61360-4": {
    publicationId: "IEC 61360 (series)",
    edition: "Ed 4.0 (Part 1)",
    title:
      "Standard data element types with associated classification scheme for electric components — IEC reference collection (IEC 61360-4)",
    shortTitle: "IEC CDD reference dictionary",
    abstract:
      'IEC 61360-1:2017 "specifies principles for the definition of the properties and associated attributes and explains the methods for representing verbally defined concepts in a computer-sensible form that is independent of natural language." This is the IEC 61360-4 reference dictionary itself — the canonical catalogue of classes, properties, value lists, units, and relations for electrotechnical components — together with content drawn from across the IEC 61360 series.',
    webstoreUrl: "https://webstore.iec.ch/en/publication/28560",
    publishedYear: 2017,
    profile: "Reference data (IEC CDD)",
  },
  "iec-61360-7": {
    publicationId: "IEC 61360-7:2024",
    edition: "Ed 1.0",
    title:
      "Standard data element types with associated classification scheme — Part 7: Data dictionary of cross-domain concepts",
    shortTitle: "Cross-domain general items",
    abstract:
      'IEC 61360-7:2024 "specifies the IEC CDD \'General items\' data dictionary of cross-domain concepts, classes, properties and qualifiers for use in electrotechnology and related areas." The data dictionary provides concepts (dictionary elements such as classes and properties) intended for cross-domain use across all dictionaries in the IEC 61360 framework, rather than within a single product domain.',
    webstoreUrl: "https://webstore.iec.ch/en/publication/72956",
    publishedYear: 2024,
    profile: "Reference data (IEC CDD)",
  },
  "iec-61987": {
    publicationId: "IEC 61987 (series)",
    edition: "Ed 2.0 (Part 1:2024)",
    title:
      "Industrial-process measurement and control — Data structures and elements in process equipment catalogues",
    shortTitle: "Industrial measurement and control",
    abstract:
      'IEC 61987-1:2024 "defines a generic structure in which product features of industrial process measurement devices shall be arranged, in order to facilitate the categorization of those product features, their representation by defined properties, and their exchange by properties." The series includes generic structures (Part 1), Lists of Properties for operating and device parameters (OLOP/DLOP, Parts 13–15), and domain-specific type blocks for valves, positioners, actuators, and analysers (Parts 20+).',
    webstoreUrl: "https://webstore.iec.ch/en/publication/62181",
    profile: "Reference data (IEC CDD)",
  },
  "iec-62683": {
    publicationId: "IEC 62683-1:2026",
    edition: "Ed 2.0",
    title:
      "Low-voltage switchgear and controlgear and their assemblies — Product data and properties for information exchange — Part 1: Catalogue data",
    shortTitle: "Low-voltage switchgear",
    abstract:
      'IEC 62683-1:2026 "establishes the reference dictionary of the general description of classes of low-voltage switchgear and controlgear and their assemblies based on defined properties." It provides standardised data structures for catalogue data, enabling consistent information exchange across engineering tools, e-commerce platforms, and asset-management systems.',
    webstoreUrl: "https://webstore.iec.ch/en/publication/80053",
    publishedYear: 2026,
    profile: "Reference data (IEC CDD)",
  },
  "iec-63213": {
    publicationId: "IEC TR 63213:2019",
    edition: "Ed 1.0",
    title:
      "Power measurement applications within electrical distribution networks and electrical installations",
    shortTitle: "Power measurement applications",
    abstract:
      'IEC TR 63213:2019 "intends to provide state-of-the-art information on the various electricity measurement applications made in the grid (supply side) or in electrical installations (demand side)." The Technical Report surveys the relevant international standards associated with each application and the contractual mechanisms for verifying the quality of delivered energy.',
    webstoreUrl: "https://webstore.iec.ch/en/publication/63704",
    publishedYear: 2019,
    profile: "Reference data (IEC CDD)",
  },
  "iec-62720": {
    publicationId: "IEC 62720:2023",
    edition: "Ed 2.0",
    title:
      "Quantities and units — Code values for quantities and units",
    shortTitle: "Quantities & Units (IEC 62720)",
    abstract:
      "IEC 62720 provides an unambiguous set of identifiers for quantities and units used in electrotechnology. Each quantity and unit receives a globally unique code within the IEC CDD framework, ensuring consistent terminology across all IEC product standards.",
    webstoreUrl: "https://webstore.iec.ch/en/publication/60017",
    publishedYear: 2023,
    profile: "Reference data (IEC CDD)",
  },
  "iec-63508": {
    publicationId: "IEC 63508:2026",
    edition: "Ed 1.0",
    title:
      "Circuit-Breakers and Household Equipment — Product classes and properties of miniature circuit-breakers (MCBs)",
    shortTitle: "Miniature circuit-breakers (MCBs)",
    abstract:
      'IEC 63508:2026 "describes product classes and properties, representing the miniature circuit-breaker (MCB), to become a part of the IEC 61360-4: IEC CDD." It covers the data required for product selection as well as the data required for engineering, streamlining selection, engineering, and database integration.',
    webstoreUrl: "https://webstore.iec.ch/en/publication/82396",
    publishedYear: 2026,
    profile: "Reference data (IEC CDD)",
  },
  oceanrunner: {
    publicationId: "Demonstration fixture",
    edition: "n/a",
    title: "OceanRunner — demonstration dictionary",
    shortTitle: "OceanRunner (demonstration)",
    abstract:
      "Learning resource: a fictional 'OceanRunner' transmedium-vehicle manufacturer (boat / car / submarine product lines) modelled the way a product catalogue works — option powertypes (EngineType, InteriorPackage, HullFinish), configured-product subclasses, multi-domain inheritance via is_case_of, and conditional properties gated by operating mode. 38 properties across the hierarchy, with every measured property bound to the real IEC 62720 units dictionary and cross-linked to it. Not a published IEC standard; all entities share the IRDI scheme 0112/2///OCEANRUNNER#.",
    webstoreUrl: "",
    demonstration: true,
    profile: "Learning — configuration catalogue",
  },
  scenicspots: {
    publicationId: "Demonstration dictionary",
    edition: "n/a",
    title: "ScenicSpots 旅遊景點 — global travel point-of-interest registry",
    shortTitle: "ScenicSpots 旅遊景點 (registry)",
    abstract:
      "A real dataset, end to end. Candidates are harvested from DBpedia, every entry is individually verified against its English Wikipedia article (existence, country, spot type, labels via interlanguage titles, facts verbatim in the text), then enriched from Wikidata (CC0) — native labels, coordinates, and UNESCO World Heritage grading. Thirty countries; coordinates bound to the IEC 62720 degree unit; a city dimension between country and spot; official-grade and spot-type facets on the browse page. The ontology (power-type dimensions, configured subclasses, conditional properties) is real classification. Sources and attribution in the fixture header (Wikipedia/DBpedia CC BY-SA, Wikidata CC0); generated by the pipeline in opencdd/data-scenicspots.",
    webstoreUrl: "",
    demonstration: true,
    profile: "Registry — verified real places",
  },
  antiques: {
    publicationId: "Demonstration dictionary",
    edition: "n/a",
    title:
      "East Asian Antiques 東方古董 — demonstration dictionary (extended instances)",
    shortTitle: "East Asian Antiques 東方古董 (demonstration)",
    abstract:
      "Learning resource: an auction-style cataloguing taxonomy for East Asian works of art — ceramics, bronzes, jade, painting and calligraphy, furniture, lacquer, cloisonné enamel, Buddhist sculpture, snuff bottles, and ukiyo-e prints — stacked over category × dynasty × culture powertypes, with a 'Mark and Period' conditional (reign marks apply only to ceramics), configured subclasses (Ming blue-and-white, Goryeo celadon), and twelve well-known museum objects registered as individuals with native names. Measurements cross-link to the IEC 62720 units dictionary.",
    webstoreUrl: "",
    demonstration: true,
    profile: "Learning — taxonomy + collection",
  },
};
