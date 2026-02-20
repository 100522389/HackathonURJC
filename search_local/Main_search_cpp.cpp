#include <iostream>
#include <fstream>
#include <string>
#include <chrono>
#include "Compile/graph.hpp"
#include "Compile/loader.hpp"
#include "Compile/algorithm.hpp"

int main(int argc, char* argv[]) {
    auto start_time = std::chrono::high_resolution_clock::now();
    if (argc != 3) {
        std::cerr << "Uso: " << argv[0] << " <nodo_1> <nodo_2>\n";
        return 1;
    }
    // Parámetros fijos para el servicio
    int source = std::stoi(argv[1]);
    int target = std::stoi(argv[2]);
    const std::string basename = "DIMAC/USA-road-d.USA";
    const Algorithm::HeuristicType heuristic = Algorithm::HeuristicType::EUCLIDEAN;
    // Cargar el grafo desde los archivos DIMAC
    std::cout << "Cargando grafo desde: " << basename << "\n";
    Graph graph;
    auto load_stats = Loader::DIMACS(basename, graph);
    std::cout << "Grafo cargado con " << graph.size() << " nodos\n";
    std::cout << "Arcos procesados: " << load_stats.edges_processed << "\n";
    // Construir el grafo inverso para A* bidirectional
    std::cout << "Construyendo grafo inverso...\n";
    graph.BuildReverseGraph();
    std::cout << "Grafo inverso construido\n\n";
    // Ejecutar A* Bidireccional con heurística euclídea
    std::cout << "Ejecutando A* Bidirectional (heurística euclídea)\n";
    std::cout << "Desde nodo " << source << " hasta nodo " << target << "...\n";
    auto algorithm_start = std::chrono::high_resolution_clock::now();
    auto bi_result = Algorithm::BidirectionalAStar(graph, source, target, heuristic);
    auto algorithm_end = std::chrono::high_resolution_clock::now();
    if (!bi_result.found) {
        std::cout << "No existe camino\n";
        auto end_time = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time);
        std::cout << "Tiempo total de ejecución: " << duration.count() << " ms\n";
        return 0;
    }
    std::cout << "Coste total: " << bi_result.cost << "\n";
    int total_expansions = bi_result.nodes_expanded_forward + bi_result.nodes_expanded_backward;
    std::cout << "Nodos expandidos: " << total_expansions << "\n";
    auto algorithm_duration = std::chrono::duration_cast<std::chrono::milliseconds>(algorithm_end - algorithm_start);
    std::cout << "Tiempo de ejecución: " << algorithm_duration.count() << " ms\n";
    if (algorithm_duration.count() > 0) {
        double expansions_per_sec = (total_expansions * 1000.0) / algorithm_duration.count();
        std::cout << "Expansiones: " << static_cast<int>(expansions_per_sec) << " nodos/s\n";
    }
    // Imprimir el camino con costes de arista
    std::cout << "\nCamino:\n";
    for (size_t i = 0; i < bi_result.path.size(); ++i) {
        std::cout << bi_result.path[i];
        if (i < bi_result.path.size() - 1) {
            int u = bi_result.path[i];
            int v = bi_result.path[i+1];
            int edge_cost = 0;
            for (const auto& [neighbor, weight] : graph.neighbors(u)) {
                if (neighbor == v) {
                    edge_cost = weight;
                    break;
                }
            }
            std::cout << " - (" << edge_cost << ") - ";
        }
    }
    std::cout << "\n";
    auto end_time = std::chrono::high_resolution_clock::now();
    auto total_duration = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time);
    std::cout << "\nTiempo total de ejecución: " << total_duration.count() << " ms\n";
    return 0;
}
